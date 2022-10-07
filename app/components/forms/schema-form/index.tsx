/*
 * Copyright (c) 2022 Oliver Ni
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { PropsWithChildren } from "react";
import type { FormProps } from "remix-validated-form";
import type { z, ZodObject, ZodRawShape } from "zod";
import type { FieldProps } from "~/components/forms/schema-form/from-zod";

import { withZod } from "@remix-validated-form/with-zod";
import { useMemo } from "react";
import { useIsSubmitting, ValidatedForm } from "remix-validated-form";
import clsx from "clsx";

import Button from "~/components/button";
import { FromZodObject } from "~/components/forms/schema-form/from-zod/object";

function SubmitButton({ children }: PropsWithChildren<{}>) {
  const isSubmitting = useIsSubmitting();

  return (
    <Button type="submit" disabled={isSubmitting}>
      {children ?? "Submit"}
    </Button>
  );
}

type SchemaFormOwnProps<S extends ZodRawShape, T extends ZodObject<S>> = {
  id: string;
  schema: T;
  buttonLabel?: string;
  fieldProps?: FieldProps<T>;
};

type SchemaFormProps<S extends ZodRawShape, T extends ZodObject<S>> = SchemaFormOwnProps<S, T> &
  Omit<FormProps<z.infer<T>>, "validator">;

export default function SchemaForm<S extends ZodRawShape, T extends ZodObject<S>>({
  id,
  schema,
  buttonLabel,
  fieldProps,
  className,
  children,
  ...props
}: SchemaFormProps<S, T>) {
  const validator = useMemo(() => withZod(schema), [schema]);

  return (
    <ValidatedForm
      className={clsx`flex flex-col gap-5 ${className}`}
      id={id}
      validator={validator}
      {...props}
    >
      <FromZodObject fieldProps={fieldProps} type={schema} />
      <input type="hidden" name="_form" value={id} />
      {children}
      <SubmitButton>{buttonLabel}</SubmitButton>
    </ValidatedForm>
  );
}
